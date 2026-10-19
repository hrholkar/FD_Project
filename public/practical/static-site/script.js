/**
 * LearnSmart: Client-Side Interactive Course Engine
 * Demonstrates static client JavaScript execution served via Express.
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Light / Dark Mode Toggle
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const savedTheme = localStorage.getItem("static_site_theme");

  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.body.classList.add("dark-mode");
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      const isDark = document.body.classList.contains("dark-mode");
      themeToggleBtn.innerHTML = isDark
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';
      localStorage.setItem("static_site_theme", isDark ? "dark" : "light");
    });
  }

  // 2. Syllabus Module Search & Filter
  const searchInput = document.getElementById("courseSearchInput");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const courseCards = document.querySelectorAll(".course-card");

  let activeCategory = "all";
  let searchQuery = "";

  function filterCards() {
    courseCards.forEach((card) => {
      const category = card.getAttribute("data-category");
      const text = card.textContent.toLowerCase();

      const matchesCat = activeCategory === "all" || category === activeCategory;
      const matchesSearch = text.includes(searchQuery.toLowerCase());

      if (matchesCat && matchesSearch) {
        card.style.display = "flex";
      } else {
        card.style.display = "none";
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim();
      filterCards();
    });
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.getAttribute("data-filter");
      filterCards();
    });
  });

  // 3. Lab Workload Calculator Demo
  const calcBtn = document.getElementById("calculateBtn");
  const studentCountInput = document.getElementById("studentCountInput");
  const creditHoursInput = document.getElementById("creditHoursInput");
  const totalHoursVal = document.getElementById("totalHoursVal");
  const batchesVal = document.getElementById("batchesVal");
  const facultyVal = document.getElementById("facultyVal");

  function runCalculation() {
    const students = parseInt(studentCountInput.value, 10) || 0;
    const weeklyHours = parseInt(creditHoursInput.value, 10) || 0;

    // Assumptions: 16 weeks semester, 20 students per batch max
    const semesterWeeks = 16;
    const totalStudentHours = students * weeklyHours * semesterWeeks;
    const batches = Math.ceil(students / 20) || 1;
    const facultyNeeded = Math.ceil(batches * 0.75) || 1;

    totalHoursVal.textContent = `${totalStudentHours.toLocaleString()} hrs`;
    batchesVal.textContent = `${batches} Batch${batches > 1 ? "es" : ""}`;
    facultyVal.textContent = `${facultyNeeded} Faculty Member${facultyNeeded > 1 ? "s" : ""}`;
  }

  if (calcBtn) {
    calcBtn.addEventListener("click", runCalculation);
  }

  console.log("LearnSmart Course Catalog scripts initialized successfully.");
});
