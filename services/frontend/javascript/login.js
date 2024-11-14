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
                $("#login-wait").attr('class', 'ui message')
            },
            success: (res) => {
                window.location = "/storage"
                console.log(`login succeeded: status ${res.status}`)
            },
            error: (res) => {
                $("#login-wait").attr('class', 'ui hidden message')
                $("#login-form").attr('class', 'ui error form')
                $("#login-error-message").text(res.message)
                console.error(`login failed: status ${res.status} - ${res.message}`)
            }
        })
    })
})