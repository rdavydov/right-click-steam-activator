const optionsForm = document.getElementById('options-form');
const sessionidInput = document.getElementById('sessionid-input');
const steamLoginSecureInput = document.getElementById('steamLoginSecure-input');
const infoBox = document.getElementById('info-box');

optionsForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const sessionid = sessionidInput.value;
    const steamLoginSecure = steamLoginSecureInput.value;

    if (sessionid && steamLoginSecure) {
        chrome.storage.sync.set({ sessionid, steamLoginSecure }, () => {
            // manifest v3: cookies API не доступен напрямую из options page
            // Передаем данные в service worker через messaging
            if (sessionid) {
                chrome.runtime.sendMessage({
                    action: "setCookie",
                    cookie: {
                        url: "https://store.steampowered.com/",
                        name: "sessionid",
                        value: sessionid,
                        secure: true,
                        httpOnly: true
                    }
                }, (response) => {
                    console.log("sessionid cookie value is set (via service worker)");
                });
            }

            if (steamLoginSecure) {
                chrome.runtime.sendMessage({
                    action: "setCookie",
                    cookie: {
                        url: "https://store.steampowered.com/",
                        name: "steamLoginSecure",
                        value: steamLoginSecure,
                        secure: true,
                        httpOnly: true
                    }
                }, (response) => {
                    console.log("steamLoginSecure cookie value is set (via service worker)");
                });
            }

            // Update existing info box
            infoBox.classList.remove('error');
            infoBox.classList.add('success');
            infoBox.textContent = 'Cookie values are set for the extension and for the Steam store.';
        });
    } else {
        chrome.storage.sync.set({ sessionid: "", steamLoginSecure: "" }, () => {
            sessionidInput.value = '';
            steamLoginSecureInput.value = '';
            // Update existing info box
            infoBox.classList.remove('success');
            infoBox.classList.add('error');
            infoBox.textContent = 'Cookie values are cleared for the extension. We\'ll get them from the Steam store.';
        });
    }
});

chrome.storage.sync.get(['sessionid', 'steamLoginSecure'], ({ sessionid, steamLoginSecure }) => {
    sessionidInput.value = sessionid || '';
    steamLoginSecureInput.value = steamLoginSecure || '';
});
