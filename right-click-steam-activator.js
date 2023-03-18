function activatekey(info) {
    // const _re = new RegExp('^[0-9A-Z]{4,7}-[0-9A-Z]{4,7}-[0-9A-Z]{4,7}(?:(?:-[0-9A-Z]{4,7})?(?:-[0-9A-Z]{4,7}))?$', 'i');

    // Declare a regular expression that matches a string of 4-5 alphanumeric characters, 
    // followed by a hyphen and another string of 4-5 alphanumeric characters, repeated 
    // 2-4 times. This pattern is case-insensitive.
    const regex = /[0-9A-Z]{4,5}(?:-[0-9A-Z]{4,5}){2,4}/i;
    // Trim leading and trailing whitespace from the selected text and attempt to 
    // match it against the regular expression.
    // ?. is an optional chaining operator to safely access the first element of the resulting array.
    // If there is no match, it will return undefined instead of throwing an error.
    const _key = info.selectionText.trim().match(regex)?.[0];

    if (_key) {
        console.log("Activating Steam key: ", _key);

        // Retrieve sessionid from storage or default to empty string using promises
        const sessionidPromise = new Promise((resolve, reject) => {
            chrome.storage.sync.get({ sessionid: "" }, function ({ sessionid }) {
                if (sessionid) {
                    console.log("Using user-supplied sessionid cookie:", sessionid);
                    resolve(sessionid);
                } else {
                    console.log("User-supplied sessionid cookie not found in storage. Getting it from the Steam website.");
                    // Retrieve sessionid cookie from https://store.steampowered.com/
                    chrome.cookies.get(
                        { url: "https://store.steampowered.com/", name: "sessionid" },
                        function (cookie) {
                            if (cookie) {
                                const sessionid = cookie.value;
                                console.log("Retrieved sessionid cookie from https://store.steampowered.com/:", sessionid);
                                resolve(sessionid);
                            } else {
                                const error = new Error("sessionid cookie not found!");
                                alert(error);
                                reject(error);
                            }
                        }
                    );
                }
            });
        });

        // Use the sessionid value after it has been retrieved from storage or cookies
        sessionidPromise.then((sessionid) => {
            // Create form data
            const formData = new FormData();
            formData.append('product_key', _key);
            formData.append('sessionid', sessionid);

            // Send POST request to activate key
            fetch('https://store.steampowered.com/account/ajaxregisterkey/', {
                method: 'POST',
                credentials: 'include',
                body: formData
            })
                .then(response => response.json())
                .catch(error => {
                    alert("Failed to parse response as JSON. Most likely you are not logged in to Steam in the browser.");
                    console.error("Failed to parse response as JSON: " + error);
                    throw error;
                })
                .then(data => {
                    switch (data.success) {
                        case 1:
                            alert("Activated: " + data.purchase_receipt_info.line_items[0].line_item_description);
                            return;
                        case 21:
                            alert("ERROR! Not a valid sessionid: " + sessionid);
                            return;
                        case 2:
                            console.log("'success' is 2. Key is not activated.")
                            break;
                        default:
                            alert("success: " + data.success);
                            break;
                    }

                    // const resultDetail = data.purchase_receipt_info.result_detail;

                    switch (data.purchase_result_details) {
                        case 53:
                            alert("Temporary ban from Steam. Ban should lift in 45-60 minutes.");
                            return;
                        case 9:
                            alert("Already own: " + data.purchase_receipt_info.line_items[0].line_item_description);
                            return;
                        case 14:
                            alert("Invalid key: " + _key);
                            return;
                        case 15:
                            alert("Somebody already activated this code for: " + data.purchase_receipt_info.line_items[0].line_item_description);
                            return;
                        case 13:
                            alert("Regional restrictions: " + data.purchase_receipt_info.line_items[0].line_item_description);
                            return;
                        case 24:
                            alert("Missing base game: " + data.purchase_receipt_info.line_items[0].line_item_description);
                            return;
                        case 36:
                            alert("Need a PS3?");
                            return;
                        case 50:
                            alert("This is the recharge code!");
                            return;
                        default:
                            alert("purchase_result_details: " + data.purchase_result_details);
                            break;
                    }
                })
                .catch(error => {
                    // if (!data) return;
                    console.error("Failed to parse data from response's JSON: " + error);
                    throw error;
                });
        });
    } else {
        alert("ERROR! Not a valid Steam key.");
    }
}

chrome.contextMenus.removeAll(function () {
    chrome.contextMenus.create({
        id: "ActSteamKey",
        title: "Activate: %s",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener(function (info) {
    if (info.menuItemId == "ActSteamKey") {
        activatekey(info);
    }
});
