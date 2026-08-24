const waecResults = {
  "2024": [
    ["English Language", 0, 31, 12, 0, 43, 43, 0, 100, 0],
    ["Mathematics", 24, 19, 0, 0, 43, 43, 0, 100, 0],
    ["Further Maths", 12, 0, 0, 0, 12, 12, 0, 100, 0],
    ["Chemistry", 19, 5, 0, 0, 24, 24, 0, 100, 0],
    ["Physics", 1, 13, 10, 0, 24, 24, 0, 100, 0],
    ["Biology", 1, 24, 2, 0, 26, 26, 0, 100, 0],
    ["Economics", 5, 35, 3, 0, 43, 43, 0, 100, 0],
    ["Civic", 8, 34, 1, 0, 43, 43, 0, 100, 0],
    ["F. Accounting", 5, 3, 1, 0, 9, 9, 0, 100, 0],
    ["Commerce", 0, 7, 2, 0, 9, 9, 0, 100, 0],
    ["Government", 14, 8, 0, 0, 22, 22, 0, 100, 0],
    ["Literature in English", 0, 6, 6, 0, 12, 12, 0, 100, 0],
    ["Islamic Studies", 0, 10, 5, 0, 15, 15, 0, 100, 0],
    ["Food & Nutrition", 0, 9, 0, 0, 9, 9, 0, 100, 0],
    ["Agric. Sc.", 3, 2, 0, 0, 5, 5, 0, 100, 0],
    ["Data Processing", 0, 4, 38, 1, 43, 42, 1, 98, 2],
    ["Yoruba", 0, 0, 0, 13, 13, 0, 13, 0, 100]
  ],
  "2025": [
    [
        "English Language",
        0,
        0,
        19,
        2,
        21,
        19,
        2,
        "90.48",
        "9.52"
    ],
    [
        "General Mathematics",
        11,
        10,
        0,
        0,
        21,
        21,
        0,
        100,
        0
    ],
    [
        "Further Mathematics",
        4,
        8,
        0,
        0,
        12,
        12,
        0,
        100,
        0
    ],
    [
        "Chemistry",
        4,
        10,
        0,
        0,
        14,
        14,
        0,
        100,
        0
    ],
    [
        "Physics",
        7,
        7,
        0,
        0,
        14,
        14,
        0,
        100,
        0
    ],
    [
        "Biology",
        8,
        6,
        0,
        0,
        14,
        14,
        0,
        100,
        0
    ],
    [
        "Literature in English",
        0,
        0,
        1,
        1,
        2,
        1,
        1,
        50,
        50
    ],
    [
        "Economics",
        3,
        15,
        1,
        0,
        19,
        19,
        0,
        100,
        0
    ],
    [
        "Civics Education",
        4,
        16,
        1,
        0,
        21,
        21,
        0,
        100,
        0
    ],
    [
        "Data Processing",
        4,
        12,
        5,
        0,
        21,
        21,
        0,
        100,
        0
    ],
    [
        "Government",
        7,
        0,
        0,
        0,
        7,
        7,
        0,
        100,
        0
    ],
    [
        "F-Accounting",
        4,
        1,
        0,
        0,
        5,
        5,
        0,
        100,
        0
    ],
    [
        "Commerce",
        0,
        5,
        2,
        0,
        7,
        7,
        0,
        100,
        0
    ],
    [
        "Food & Nutrition",
        5,
        2,
        0,
        0,
        7,
        7,
        0,
        100,
        0
    ],
    [
        "Agric. Sc.",
        2,
        0,
        0,
        0,
        2,
        2,
        0,
        100,
        0
    ],
    [
        "Islamic Studies",
        0,
        3,
        0,
        0,
        3,
        3,
        0,
        100,
        0
    ],
    [
        "Yoruba",
        0,
        0,
        1,
        1,
        2,
        1,
        1,
        50,
        50
    ]
]
};

const params = new URLSearchParams(window.location.search);
const year = params.get("year") || "2024";
const rows = waecResults[year];

const title = document.getElementById("waecResultTitle");
const subtitle = document.getElementById("waecResultSubtitle");
const tableTitle = document.getElementById("waecTableTitle");
const badge = document.getElementById("waecSessionBadge");
const tableBody = document.getElementById("waecTableBody");
const published = document.getElementById("waecPublishedResult");
const unavailable = document.getElementById("waecUnavailable");
const unavailableTitle = document.getElementById("waecUnavailableTitle");

title.textContent = `${year} WAEC RESULT STATISTICS`;
subtitle.textContent = `${year} May/June examination performance`;
badge.textContent = `${year} WAEC`;

if (rows) {
  tableTitle.textContent = `ANALYSIS OF THE ${year} MAY/JUNE WAEC RESULT`;
  tableBody.innerHTML = rows.map((row, index) => {
    const [subject, a, b, c, belowC, students, passed, failed, passPct, failPct] = row;
    return `<tr>
      <td>${index + 1}.</td>
      <td class="subject-name">${subject}</td>
      <td>${a}</td><td>${b}</td><td>${c}</td><td>${belowC}</td>
      <td>${students}</td><td>${passed}</td><td>${failed}</td>
      <td>${passPct}</td><td>${failPct}</td>
    </tr>`;
  }).join("");
} else {
  published.hidden = true;
  unavailable.hidden = false;
  unavailableTitle.textContent = `${year} WAEC Result Statistics`;
}
