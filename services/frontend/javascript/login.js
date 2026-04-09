$(document).ready(() => {
    $("#login-form").submit((e) => {
        e.preventDefault()
        console.log("user logging in")
        $.ajax({
            url: "/login",
            method: "POST",
            data: {
                username: $("#login-username").val(),
                password: $("#login-password").val()
            },
            beforeSend: () => {
                $("#login-wait").attr('class', 'msg')
            },
            success: (res) => {
                window.DD_RUM && window.DD_RUM.setUser({
                    username: $("#login-username").val(),
                })
                console.log(`login succeeded: status ${res.status}`)
                window.location = "/storage"
            },
            error: (res) => {
                $("#login-wait").attr('class', 'msg msg-hidden')
                $("#login-form").attr('class', 'form form-error')
                $("#login-error-message").text(res.message)
                console.error(`login failed: status ${res.status} - ${res.message}`)
            }
        })
    })
})