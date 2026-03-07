const API_URL = 'http://localhost:3000/api/inbox'; // On passe par le serveur Next.js pour l'authentification (cookies)

document.getElementById('capture-page').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const noteInput = document.getElementById('note-input');
  
  if (tab) {
    const pageInfo = `Source: ${tab.title}\nURL: ${tab.url}`;
    const currentText = noteInput.value;
    noteInput.value = currentText ? `${currentText}\n\n${pageInfo}` : pageInfo;
  }
});

document.getElementById('send-btn').addEventListener('click', async () => {
  const noteInput = document.getElementById('note-input');
  const statusMsg = document.getElementById('status-message');
  const content = noteInput.value.trim();

  if (!content) {
    showStatus('Veuillez saisir une note.', 'error');
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Indispensable pour envoyer les cookies de session Next.js
      body: JSON.stringify({
        content: content,
        bucket: 'untreated'
      })
    });

    if (response.ok) {
      showStatus('Capturé avec succès !', 'success');
      noteInput.value = '';
      setTimeout(() => window.close(), 1500);
    } else {
      const errData = await response.json();
      showStatus(`Erreur: ${errData.detail || response.statusText}`, 'error');
    }
  } catch (err) {
    showStatus('Impossible de contacter le serveur (8000).', 'error');
    console.error(err);
  }
});

function showStatus(text, type) {
  const statusMsg = document.getElementById('status-message');
  statusMsg.textContent = text;
  statusMsg.className = `status ${type}`;
  statusMsg.classList.remove('hide');
}
