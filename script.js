/* BALAD PRIVATE SCHOOLS — SITE INTERACTIONS */

document.addEventListener("DOMContentLoaded", () => {
  // Back button on internal pages only. The home/index page has nowhere to go back to.
  if (!document.body.classList.contains("home-page") && !document.querySelector(".site-back-button")) {
    const back = document.createElement("button");
    back.type = "button";
    back.className = "site-back-button";
    back.setAttribute("aria-label", "Go back");
    back.innerHTML = "&#8592; <span>Back</span>";
    back.addEventListener("click", () => {
      if (window.history.length > 1) window.history.back();
      else window.location.href = "index.html";
    });
    document.body.appendChild(back);
  }

  // Mobile navigation fallback: keep the hamburger functional even if CSS/label behaviour is interrupted.
  const menuToggle = document.getElementById("balad-menu-toggle");
  const menuButton = document.querySelector(".menu-btn");
  const mainNav = document.getElementById("balad-main-nav");
  if (menuToggle && menuButton && mainNav) {
    menuButton.addEventListener("click", (event) => {
      event.preventDefault();
      menuToggle.checked = !menuToggle.checked;
    });
    mainNav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => { menuToggle.checked = false; });
    });
  }

  if (!document.querySelector(".site-top-button")) {
    const top = document.createElement("button");
    top.type = "button";
    top.className = "site-top-button";
    top.setAttribute("aria-label", "Back to top");
    top.innerHTML = "&#8593;";
    top.addEventListener("click", () => window.scrollTo({top: 0, behavior: "smooth"}));
    document.body.appendChild(top);

    const updateTop = () => {
      top.classList.toggle("show", window.scrollY > 280);
    };
    window.addEventListener("scroll", updateTop, {passive: true});
    updateTop();
  }
  document.querySelectorAll(".faq-item").forEach(item => {
    const button = item.querySelector(".faq-question");
    if (button) {
      button.addEventListener("click", () => {
        item.classList.toggle("active");
      });
    }
  });

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;

      const target = document.querySelector(id);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  document.querySelectorAll("[data-year]").forEach(el => {
    el.textContent = new Date().getFullYear();
  });
});
