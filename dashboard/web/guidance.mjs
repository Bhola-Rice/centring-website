export function installPractice(showDialog) {
  document.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.hasAttribute('data-guidance-practice')) {
      showDialog('<h2 id="dialog-title">Practice space</h2>', '<div class="guidance-practice"><p>Lantern Row Heritage Commons · Grant application</p><h3>Open Studio Saturdays</h3><label class="field">How will your programme serve local families?<textarea rows="5">Lantern Row will offer six Saturday art workshops where young people and caregivers can work with local artists at no charge.</textarea></label><p>Edit this example, then review it. Practice uses no AI credits and closes without saving to your workspace.</p><button class="btn primary" data-guidance-check>Review practice answer</button><p role="status" data-practice-result></p></div>');
    } else if (target.hasAttribute('data-guidance-check')) {
      const panel = target.closest('.guidance-practice');
      panel.querySelector('[data-practice-result]').textContent = panel.querySelector('textarea').value.trim() ? 'Review who will take part, what they will do and how you will measure the result.' : 'Write a practice answer first.';
    }
  });
}
