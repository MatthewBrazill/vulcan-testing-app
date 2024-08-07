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
            beforeSend: () => {
                $("#sign-up-wait").attr('class', 'ui message')
            },
            success: () => {
                $("#sign-up-wait").attr('class', 'ui hidden message')
                $("#sign-up-form").attr('class', 'ui success form')
                $.ajax({
                    url: "/login",
                    method: "POST",
                    data: {
                        username: $("#sign-up-username").val(),
                        password: $("#sign-up-password").val()
                    },
                    success: () => window.location = "/storage",
                    error: (res) => {
                        $("#sign-up-form").attr('class', 'ui error form')
                        $("#sign-up-error-message").text(res.message)
                    }
                })
            },
            error: (res) => {
                $("#sign-up-wait").attr('class', 'ui hidden message')
                $("#sign-up-form").attr('class', 'ui error form')
                $("#sign-up-error-message").text(res.message)
            }
        })
    })
})