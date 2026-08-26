const cards = [...document.querySelectorAll<HTMLElement>('.rail article')]

function activate(index: number) {
  cards.forEach((card, current) => card.classList.toggle('active', current === index))
}

cards.forEach((card, index) => {
  card.addEventListener('pointerenter', () => activate(index))
  card.addEventListener('focusin', () => activate(index))
})

activate(2)

