// KALKI Landing Page Interactions

document.addEventListener('DOMContentLoaded', () => {
    // 1. Scroll Reveal Animation
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        const elementVisible = 150;
        
        revealElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            if (elementTop < windowHeight - elementVisible) {
                element.classList.add('active');
            }
        });
    };
    
    // Initial check
    revealOnScroll();
    
    // Listen for scroll
    window.addEventListener('scroll', revealOnScroll);
    
    // 2. Smooth Scrolling for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Adjust for fixed navbar height
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - navHeight;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 3. Mock Widget Animation (Randomizing Score for effect)
    const scoreFill = document.querySelector('.score-fill');
    if (scoreFill) {
        setInterval(() => {
            // Pulse the score slightly to make it look alive
            const currentWidth = parseFloat(scoreFill.style.width);
            const newWidth = currentWidth > 95 ? 98 : 99;
            scoreFill.style.width = newWidth + '%';
        }, 2000);
    }

    // 4. Theme Toggle Functionality
    const themeToggle = document.getElementById("theme-toggle");
    const sunIcon = document.getElementById("theme-icon-sun");
    const moonIcon = document.getElementById("theme-icon-moon");

    if (themeToggle) {
        const updateIcons = (theme) => {
            if (theme === "light") {
                if (sunIcon) sunIcon.style.display = "block";
                if (moonIcon) moonIcon.style.display = "none";
            } else {
                if (sunIcon) sunIcon.style.display = "none";
                if (moonIcon) moonIcon.style.display = "block";
            }
        };

        // Initialize icons based on current theme
        const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
        updateIcons(currentTheme);

        themeToggle.addEventListener("click", () => {
            const activeTheme = document.documentElement.getAttribute("data-theme") || "dark";
            const newTheme = activeTheme === "dark" ? "light" : "dark";
            
            document.documentElement.setAttribute("data-theme", newTheme);
            localStorage.setItem("kalkiTheme", newTheme);
            updateIcons(newTheme);
        });
    }
});
