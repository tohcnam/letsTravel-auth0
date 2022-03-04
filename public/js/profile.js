let inputMfa = $('#inputMfa');
let inputLastName = document.querySelector('#inputLastname');
let inputFirstName = document.querySelector('#inputFirstname');
let inputEmail = document.querySelector('#staticEmail');
let submitSettings = document.querySelector('.update-settings-form');
let userId = document.querySelector('#sub').value;
let accessToken = document.querySelector('#access_token');
let divAccessToken = document.querySelector('.accessTokenParsed');
let idToken = document.querySelector('#id_token');
let divIdToken = document.querySelector('.idTokenParsed');

document.addEventListener('DOMContentLoaded', async function(){
    let user = await fetch('/user/'+userId)
    .then((res) => res.json())
    .then((data) => data);

    (user.user_metadata.mfa) ? inputMfa.bootstrapToggle('on') : inputMfa.bootstrapToggle('off');
    inputLastName.value = (user.family_name) ? user.family_name : "";
    inputFirstName.value = (user.given_name) ? user.given_name : "";
    inputEmail.value = user.email;

    let parsedAccessToken = parseJwt(accessToken.value);
    divAccessToken.textContent = JSON.stringify(parsedAccessToken, undefined, 2);
    let parsedIdToken = parseJwt(idToken.value);
    divIdToken.textContent = JSON.stringify(parsedIdToken, undefined, 2);
});

submitSettings.addEventListener('submit', async (e) => {
    e.preventDefault();

    let mfa = document.querySelector('#inputMfa').checked;
    await fetch('/user', {
        method: 'POST', 
        headers: {
            "Content-Type": "application/json"
        }, 
        body: JSON.stringify({
            userId: userId,
            lastName: inputLastName.value,
            firstName: inputFirstName.value, 
            mfa: mfa
        })
    })
    .then((res) => res.text())
    .then((data) => window.open(document.location.protocol + "//" + document.location.host + "/login", "_self"));
});

function parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
};
