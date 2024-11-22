import {
  WebPortal,
  LoginError,
} from "https://cdn.jsdelivr.net/npm/jsjiit/dist/jsjiit.esm.js";

let portal = new WebPortal();
let student_attendace = null;
async function login() {
  try {
    await portal.student_login(
      localStorage.getItem("enroll"),
      localStorage.getItem("pass")
    );
    console.log("login successfull");
    document.getElementById("name").innerText = portal.session.enrollmentno;
    document.getElementById("welcome").innerText += toProperCase(
      portal.session.name
    );
  } catch (error) {
    console.log(error);
  }
  console.log(portal);
}
function checkAttendance(student_attendace) {
  if (
    !student_attendace ||
    !student_attendace.studentattendancelist ||
    student_attendace.studentattendancelist.length === 0
  ) {
    console.error("No attendance data available");
    document.getElementById("percentage").innerText = "No data available.";
    return;
  }

  let allSubjectsAbove75 = student_attendace.studentattendancelist.every(
    (subject) => subject.LTpercantage >= 75
  );

  if (allSubjectsAbove75) {
    document.getElementById("percentage").innerText = "No worries! 😊";
  } else {
    document.getElementById("percentage").innerText =
      "Attend college regularly! 📚";
  }
}
async function fetch_attendance() {
  const metadata = await portal.get_attendance_meta();
  const header = metadata.latest_header();
  const semesters = metadata.semesters;

  try {
    student_attendace = await portal.get_attendance(header, semesters[0]);
    console.log("Attendance fetched", student_attendace);
  } catch (error) {
    console.log("Trying with previous semester");
    student_attendace = await portal.get_attendance(header, semesters[1]);
    console.log("Attendance fetched with previous semester", student_attendace);
  }
}
function toProperCase(input) {
  return input
    .toLowerCase() // Convert the entire string to lowercase
    .split(" ") // Split the string into an array of words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize the first letter of each word
    .join(" "); // Join the array back into a single string
}
function average(student_attendace) {
  if (
    !student_attendace ||
    !student_attendace.studentattendancelist ||
    student_attendace.studentattendancelist.length === 0
  ) {
    console.error("No attendance data available");
    document.getElementById("percentage").innerText = "N/A";
    return;
  }

  let sum = 0;
  let count = student_attendace.studentattendancelist.length;

  student_attendace.studentattendancelist.forEach((el) => {
    sum += el.LTpercantage || 0;
  });

  let avg = sum / count;
  document.getElementById("percentage").innerText = `${avg.toFixed(2)}%`;
}
function exam() {
  document.getElementById("exams").innerText = "Enjoy!";
}
async function subjects() {
  let subjects = null;
  try {
    console.log("Getting latest semester subjects...");
    const registeredSems = await portal.get_registered_semesters();
    const latestSem = registeredSems[0];

    const registeredSubjects =
      await portal.get_registered_subjects_and_faculties(latestSem);

    if (registeredSubjects.total_credits === 0) {
      console.log("Failed to fetch subjects.");
      throw new Error("No subjects found.");
    }

    subjects = registeredSubjects.subjects;
  } catch (error) {
    console.log("Trying with the previous semester...");
    const registeredSems = await portal.get_registered_semesters();
    const latestSem = registeredSems[1];

    const registeredSubjects =
      await portal.get_registered_subjects_and_faculties(latestSem);

    subjects = registeredSubjects.subjects;
  }

  console.log(subjects);

  // Consolidate subjects to remove duplicates
  const consolidatedSubjects = {};
  subjects.forEach((subject) => {
    if (!consolidatedSubjects[subject.subject_code]) {
      consolidatedSubjects[subject.subject_code] = {
        subject_desc: subject.subject_desc,
        credits: subject.credits,
        employee_name: subject.employee_name,
        components: [],
      };
    }
    consolidatedSubjects[subject.subject_code].components.push(
      subject.subject_component_code
    );
  });

  // Generate HTML for subjects
  let tofill = `
    <table border="1" cellpadding="10px" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr>
          <th>Subject Name</th>
          <th>Subject Code</th>
          <th>Faculty Name</th>
          <th>Credits</th>
          <th>Components</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const [code, subject] of Object.entries(consolidatedSubjects)) {
    tofill += `
      <tr>
        <td>${toProperCase(subject.subject_desc)}</td>
        <td>${code}</td>
        <td>${toProperCase(subject.employee_name)}</td>
        <td>${subject.credits}</td>
        <td>${subject.components.join(", ")}</td>
      </tr>
    `;
  }

  tofill += `
      </tbody>
    </table>
  `;

  document.getElementById("subjects").innerHTML = tofill;
}
document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("Initializing application...");

    await login();
    console.log("Login completed");

    await subjects();
    console.log("Subjects fetched");

    exam();
    console.log("Exam info set");

    
    await fetch_attendance();
    attendanceToTable(student_attendace);
    checkAttendance(student_attendace);
    console.log("Attendance tasks completed");

    console.log("All tasks done");
  } catch (error) {
    console.error("An error occurred during initialization:", error);
    document.getElementById("error").innerText =
      "Something went wrong. Please try refreshing the page.";
  }
});

function attendanceToTable(attendance) {
  const data = attendance.studentattendancelist;

  if (!data || data.length === 0) {
    document.getElementById("table").innerHTML = "<p>No attendance data available.</p>";
    return;
  }

  // Utility function to handle undefined or empty values
  const safeValue = (value, defaultValue = "--") => value !== undefined && value !== "" ? value : defaultValue;

  // Table headers
  const headers = [
    "Subject",
    "Total %",
    "L %",
    "P %",
    "T %",
    "Total Classes",
    "Total Presents",
    "Absent",
  ];

  // Generate table header
  let thead = `
    <table border="1" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr>
      </thead>
      <tbody>
  `;

  // Generate table rows
  let tbody = data
    .map(el => `
      <tr>
        <td>${safeValue(el.subjectcode)}</td>
        <td>${safeValue(el.LTpercantage)}</td>
        <td>${safeValue(el.Lpercentage)}</td>
        <td>${safeValue(el.Ppercentage)}</td>
        <td>${safeValue(el.Tpercentage)}</td>
        <td>${safeValue(parseInt(el.Ltotalclass || 0) + parseInt(el.Ttotalclass || 0) + parseInt(el.Ptotalclass || 0), 0)}</td>
        <td>${safeValue(parseInt(el.Ltotalpres || 0) + parseInt(el.Ttotalpres || 0) + parseInt(el.Ptotalpres || 0), 0)}</td>
        <td>${safeValue((parseInt(el.Ltotalclass || 0) + parseInt(el.Ttotalclass || 0) + parseInt(el.Ptotalclass || 0)) - (parseInt(el.Ltotalpres || 0) + parseInt(el.Ttotalpres || 0) + parseInt(el.Ptotalpres || 0)), 0)}</td>
      </tr>
    `)
    .join("");

  // Close table
  let tend = "</tbody></table>";

  // Insert table into the DOM
  document.getElementById("table").innerHTML = thead + tbody + tend;
}
document.getElementById("logout").addEventListener("click", () => {
  localStorage.removeItem("enroll");
  localStorage.removeItem("pass");
  window.location.href = "./index.html";
});
