(() => {
  const tabs = [...document.querySelectorAll('.track-tab')];
  const panels = [...document.querySelectorAll('[data-track-panel]')];

  if (tabs.length && panels.length) {
    const activateTrack = (tab, updateUrl = false) => {
      const panelId = tab.getAttribute('aria-controls');

      tabs.forEach((item) => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
      });

      panels.forEach((panel) => {
        panel.hidden = panel.id !== panelId;
      });

      if (updateUrl && window.history?.replaceState) {
        window.history.replaceState(null, '', `#${panelId}`);
      }
    };

    const hashPanel = panels.find((panel) => `#${panel.id}` === window.location.hash);
    const initialTab = hashPanel
      ? tabs.find((tab) => tab.getAttribute('aria-controls') === hashPanel.id)
      : tabs.find((tab) => tab.getAttribute('aria-selected') === 'true');

    activateTrack(initialTab || tabs[0]);

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        activateTrack(tab, true);
      });

      tab.addEventListener('keydown', (event) => {
        let nextIndex = index;

        if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex === index && !['Home', 'End'].includes(event.key)) return;

        event.preventDefault();
        tabs[nextIndex].focus();
        activateTrack(tabs[nextIndex], true);
      });
    });

    window.addEventListener('hashchange', () => {
      const panel = panels.find((item) => `#${item.id}` === window.location.hash);
      const tab = panel && tabs.find((item) => item.getAttribute('aria-controls') === panel.id);
      if (tab) activateTrack(tab);
    });
  }

  const keepOneOpen = (items) => {
    items.forEach((item) => {
      item.addEventListener('toggle', () => {
        if (!item.open) return;
        items.forEach((peer) => {
          if (peer !== item) peer.open = false;
        });
      });
    });
  };

  keepOneOpen([...document.querySelectorAll('.lab-card')]);
  keepOneOpen([...document.querySelectorAll('.capability-card')]);

  document.documentElement.classList.add('is-enhanced');
})();
