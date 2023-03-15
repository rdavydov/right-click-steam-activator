function activatekey(info) {
    const _re = new RegExp('^[0-9A-Z]{4,7}-[0-9A-Z]{4,7}-[0-9A-Z]{4,7}(?:(?:-[0-9A-Z]{4,7})?(?:-[0-9A-Z]{4,7}))?$', 'i');
    const _key = info.selectionText.trim();
    const _valid = (_key != '') && _re.test(_key);

    if (_valid) {
        console.log("Activating Steam key: ", _key);
        // Retrieve sessionid cookie
        chrome.cookies.get({ url: "https://store.steampowered.com/", name: "sessionid" }, function (cookie) {
            if (cookie) {
                // Create form data
                const formData = new FormData();
                formData.append('product_key', _key);
                formData.append('sessionid', cookie.value);

                // Send POST request to activate key
                fetch('https://store.steampowered.com/account/ajaxregisterkey/', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success === 1) {
                            alert("Activated: " + data.purchase_receipt_info.line_items[0].line_item_description);
                            return;
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
                    .catch(error => console.error(error));
            } else {
                alert("ERROR! sessionid cookie not found!");
            }
        });
    } else {
        alert("ERROR! Not a valid Steam key: " + _key);
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

// End of file;
