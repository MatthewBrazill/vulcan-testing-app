$(document).ready(() => {
    $("#logout-button").click((e) => {
        e.preventDefault()
        $.ajax({
            url: "/logout",
            method: "GET",
            success: () => window.location = "/login",
            error: (res) => alert(`Logout failed: ${res.status} - ${res.message}`)
        })
    })
})