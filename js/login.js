$(document).ready(() => {
    $("#login-form").submit((e) => {
        e.preventDefault()
        $.ajax({
            url: "/login",
            method: "POST",
            data: {
                username: $("#login-username").val(),
                password: $("#login-password").val()
            },
            success: (res) => window.location = "/home",
            error: (res) => {
                $("#login-form").attr('class', 'ui error form')
                $("#login-error-message").text(res.message)
            }
        })
    })
})