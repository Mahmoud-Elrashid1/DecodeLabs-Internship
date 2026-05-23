
    /* ── Hamburger / Mobile Nav ── */
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileNav    = document.getElementById('mobile-nav');

    hamburgerBtn.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('open');
      hamburgerBtn.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // close mobile nav when a link is clicked
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    /* ── Tab / Interactive Panel ── */
    const tabButtons = document.querySelectorAll('[role="tab"]');
    const tabPanels  = document.querySelectorAll('[role="tabpanel"]');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // deactivate all
        tabButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        tabPanels.forEach(p => {
          p.classList.remove('active');
          p.hidden = true;
        });
        // activate clicked
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const target = document.getElementById(btn.getAttribute('aria-controls'));
        target.classList.add('active');
        target.hidden = false;
      });

      // keyboard navigation
      btn.addEventListener('keydown', e => {
        const tabs = [...tabButtons];
        const idx  = tabs.indexOf(btn);
        if (e.key === 'ArrowRight') { tabs[(idx + 1) % tabs.length].focus(); e.preventDefault(); }
        if (e.key === 'ArrowLeft')  { tabs[(idx - 1 + tabs.length) % tabs.length].focus(); e.preventDefault(); }
      });
    });

    /* ── Back to Top ── */
    const backTop = document.getElementById('back-top');
    window.addEventListener('scroll', () => {
      backTop.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    /* ── Scroll Fade-In (IntersectionObserver) ── */
    const fadeEls = document.querySelectorAll('.fade-in');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    fadeEls.forEach(el => observer.observe(el));

    /* ── CTA Form ── */
    const ctaBtn      = document.getElementById('cta-submit-btn');
    const emailInput  = document.getElementById('email-input');
    const formFeedback= document.getElementById('form-feedback');

    ctaBtn.addEventListener('click', () => {
      const val = emailInput.value.trim();
      if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        formFeedback.textContent = '⚠ Please enter a valid email address.';
        formFeedback.style.color = '#c0392b';
        formFeedback.style.display = 'block';
        emailInput.focus();
        return;
      }
      formFeedback.textContent = '✓ Awesome! We will be in touch. Keep building.';
      formFeedback.style.color = 'var(--mocha)';
      formFeedback.style.display = 'block';
      emailInput.value = '';
    });
