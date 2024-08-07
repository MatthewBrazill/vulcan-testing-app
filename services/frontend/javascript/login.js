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
            beforeSend: () => {
                $("#login-wait").attr('class', 'ui message')
            },
            success: () => window.location = "/storage",
            error: (res) => {
                $("#login-wait").attr('class', 'ui hidden message')
                $("#login-form").attr('class', 'ui error form')
                $("#login-error-message").text(res.message)
            }
        })
    })
})