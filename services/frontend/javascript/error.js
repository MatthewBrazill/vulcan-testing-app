$(document).ready(() => {
    $("#ui-error-button").click(() => {
        $.ajax({
            url: "https://random-word-api.herokuapp.com/word",
            method: "GET",
            success: (res) => { throw new `Example error: ${res.message}` },
            error: (res) => alert(`Request failed: ${res.status} - ${res.message}`)
        })
    })
})