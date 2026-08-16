// Shared page helpers for dedicated goals pages.
(function () {
  function initializeDailyGoalsPageView() {
    if (typeof initializeGoalsSections === 'function') {
      initializeGoalsSections({ daily: true, weekly: false });
    }
    if (typeof renderDailyGoals === 'function') {
      renderDailyGoals();
    }
  }

  function initializeWeeklyGoalsPageView() {
    if (typeof initializeGoalsSections === 'function') {
      initializeGoalsSections({ daily: false, weekly: true });
    }
    if (typeof renderWeeklyGoals === 'function') {
      renderWeeklyGoals();
    }
  }

  window.initializeDailyGoalsPageView = initializeDailyGoalsPageView;
  window.initializeWeeklyGoalsPageView = initializeWeeklyGoalsPageView;
})();
