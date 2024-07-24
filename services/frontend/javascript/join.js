$(document).ready(() => {
    $("#sign-up-form").submit((e) => {
        e.preventDefault()
        $.ajax({
            url: "/user/create",
            method: "POST",
            data: {
                username: $("#sign-up-username").val(),
                password: $("#sign-up-password").val()
            },
            success: () => {
                $("#sign-up-form").attr('class', 'ui success form')
                setTimeout(() => {
                    window.location = "/login"
                }, 5000)
            },
            error: (res) => {
                $("#sign-up-form").attr('class', 'ui error form')
                $("#sign-up-error-message").text(res.message)
            }
        })
    })
})