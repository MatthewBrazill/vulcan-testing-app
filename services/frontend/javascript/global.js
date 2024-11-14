$(document).ready(() => {
    $("#logout-button").click((e) => {
        e.preventDefault()
        console.log("user logging out")
        $.ajax({
            url: "/logout",
            method: "GET",
            success: (res) => {
                window.location = "/login"
                console.log(`logout succeeded: status ${res.status}`)
            },
            error: (res) => console.error(`logout failed: ${res.status} - ${res.message}`)
        })
    })
})