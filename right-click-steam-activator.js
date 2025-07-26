function notify(message) {
    console.log("Notifying user: ", message);
    chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("images/ico128.png"), // manifest v3: use runtime.getURL
        // "iconUrl": browser.extension.getURL("images/ico128.png"),
        title: "Right-click Steam Activator",
        message: typeof message === "string" ? message : (message?.message || String(message))
    });
}

function activatekey(info) {
    // const _re = new RegExp('^[0-9A-Z]{4,7}-[0-9A-Z]{4,7}-[0-9A-Z]{4,7}(?:(?:-[0-9A-Z]{4,7})?(?:-[0-9A-Z]{4,7}))?$', 'i');

    // /^[a-zA-Z0-9]{4,6}\-[a-zA-Z0-9]{4,6}\-[a-zA-Z0-9]{4,6}$/.test(key)

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
                    console.log("User-supplied sessionid cookie was not found in the storage. Getting it from the Steam store.");
                    // Retrieve sessionid cookie from https://store.steampowered.com/
                    chrome.cookies.get(
                        { url: "https://store.steampowered.com/", name: "sessionid" },
                        function (cookie) {
                            if (cookie) {
                                const sessionid = cookie.value;
                                console.log("Retrieved sessionid cookie from https://store.steampowered.com/:", sessionid);
                                resolve(sessionid);
                            } else {
                                const error = new Error("sessionid cookie was not found!");
                                notify(error);
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
                    notify("Failed to parse response as JSON. Most likely you are not logged in to the Steam store.");
                    console.error("Failed to parse response as JSON: " + error);
                    throw error;
                })
                .then(data => {
                    switch (data.success) {
                        case 1:
                            notify("Activated: " + data?.purchase_receipt_info?.line_items[0]?.line_item_description);
                            return;
                        case 21:
                            notify("ERROR! Not a valid sessionid: " + sessionid);
                            return;
                        case 2:
                            console.log("'success' is 2. Key is not activated.")
                            break;
                        default:
                            notify("success: " + data?.success);
                            break;
                    }

                    // const resultDetail = data.purchase_receipt_info.result_detail;

                    switch (data?.purchase_result_details) {
                        case 53:
                            notify("Temporary ban from Steam. It should vanish in 45-60 minutes.");
                            return;
                        case 9:
                            notify("Already own: " + data?.purchase_receipt_info?.line_items[0]?.line_item_description);
                            return;
                        case 14:
                            notify("Invalid key: " + _key);
                            return;
                        case 15:
                            notify("Somebody already activated this code for: " + data?.purchase_receipt_info?.line_items[0]?.line_item_description);
                            return;
                        case 13:
                            notify("Regional restrictions: " + data?.purchase_receipt_info?.line_items[0]?.line_item_description);
                            return;
                        case 24:
                            notify("Missing base game: " + data?.purchase_receipt_info?.line_items[0]?.line_item_description);
                            return;
                        case 36:
                            notify("Need a PS3?"); // ?
                            return;
                        case 50:
                            notify("This is the recharge code!"); // ?
                            return;
                        default:
                            notify("purchase_result_details: " + data?.purchase_result_details);
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
        notify("Not a valid Steam key.");
    }
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "ActSteamKey",
        title: "Activate: %s",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "ActSteamKey") {
        activatekey(info);
    }
});

/* const steamKeyRedeemResponses = {
    0: 'NoDetail',
    1: 'AVSFailure',
    2: 'InsufficientFunds',
    3: 'ContactSupport',
    4: 'Timeout',
    5: 'InvalidPackage',
    6: 'InvalidPaymentMethod',
    7: 'InvalidData',
    8: 'OthersInProgress',
    9: 'AlreadyPurchased',
    10: 'WrongPrice',
    11: 'FraudCheckFailed',
    12: 'CancelledByUser',
    13: 'RestrictedCountry',
    14: 'BadActivationCode',
    15: 'DuplicateActivationCode',
    16: 'UseOtherPaymentMethod',
    17: 'UseOtherFunctionSource',
    18: 'InvalidShippingAddress',
    19: 'RegionNotSupported',
    20: 'AcctIsBlocked',
    21: 'AcctNotVerified',
    22: 'InvalidAccount',
    23: 'StoreBillingCountryMismatch',
    24: 'DoesNotOwnRequiredApp',
    25: 'CanceledByNewTransaction',
    26: 'ForceCanceledPending',
    27: 'FailCurrencyTransProvider',
    28: 'FailedCyberCafe',
    29: 'NeedsPreApproval',
    30: 'PreApprovalDenied',
    31: 'WalletCurrencyMismatch',
    32: 'EmailNotValidated',
    33: 'ExpiredCard',
    34: 'TransactionExpired',
    35: 'WouldExceedMaxWallet',
    36: 'MustLoginPS3AppForPurchase',
    37: 'CannotShipToPOBox',
    38: 'InsufficientInventory',
    39: 'CannotGiftShippedGoods',
    40: 'CannotShipInternationally',
    41: 'BillingAgreementCancelled',
    42: 'InvalidCoupon',
    43: 'ExpiredCoupon',
    44: 'AccountLocked',
    45: 'OtherAbortableInProgress',
    46: 'ExceededSteamLimit',
    47: 'OverlappingPackagesInCart',
    48: 'NoWallet',
    49: 'NoCachedPaymentMethod',
    50: 'CannotRedeemCodeFromClient',
    51: 'PurchaseAmountNoSupportedByProvider',
    52: 'OverlappingPackagesInPendingTransaction',
    53: 'RateLimited',
    54: 'OwnsExcludedApp',
    55: 'CreditCardBinMismatchesType',
    56: 'CartValueTooHigh',
    57: 'BillingAgreementAlreadyExists',
    58: 'POSACodeNotActivated',
    59: 'CannotShipToCountry',
    60: 'HungTransactionCancelled',
    61: 'PaypalInternalError',
    62: 'UnknownGlobalCollectError',
    63: 'InvalidTaxAddress',
    64: 'PhysicalProductLimitExceeded',
    65: 'PurchaseCannotBeReplayed',
    66: 'DelayedCompletion',
    67: 'BundleTypeCannotBeGifted',
}; */