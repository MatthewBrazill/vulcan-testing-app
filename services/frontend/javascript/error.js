$(document).ready(() => {
    $("#ui-error-button").click(() => {
        $.ajax({
            url: "https://random-word-api.herokuapp.com/word?number=3",
            method: "GET",
            success: (res) => { throw new Error(`Example error: ${res[0]} - ${res[1]} - ${res[2]}`) },
            error: (res) => alert(`Request failed: ${res.status} - ${res.message}`)
        })
    })
})