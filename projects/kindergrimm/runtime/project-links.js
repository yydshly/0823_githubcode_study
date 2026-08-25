const isGitHubPages = location.hostname.endsWith('github.io');

document.querySelectorAll('a[href$="docs/projects/kindergrimm.html"]').forEach((link) => {
  if (isGitHubPages) {
    link.href = new URL('../../kindergrimm.html', location.href).href;
  }
});
