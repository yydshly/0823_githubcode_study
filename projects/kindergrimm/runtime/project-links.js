const isGitHubPages = location.hostname.endsWith('github.io');

document.querySelectorAll('a[href*="docs/projects/kindergrimm.html"]').forEach((link) => {
  if (isGitHubPages) {
    const source = new URL(link.href, location.href);
    const target = new URL('../../kindergrimm.html', location.href);
    target.hash = source.hash;
    link.href = target.href;
  }
});
