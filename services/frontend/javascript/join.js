$(document).ready(() => {
    $("#sign-up-form").submit((e) => {
        e.preventDefault()
        console.log("user signing up")
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
            success: (res) => {
                $("#sign-up-wait").attr('class', 'ui hidden message')
                $("#sign-up-form").attr('class', 'ui success form')
                console.log(`signup succeeded: status ${res.status}`)
                console.log("user logging in")
                $.ajax({
                    url: "/login",
                    method: "POST",
                    data: {
                        username: $("#sign-up-username").val(),
                        password: $("#sign-up-password").val()
                    },
                    success: (res) => {
                        window.location = "/storage"
                        console.log(`login succeeded: status ${res.status}`)
                    },
                    error: (res) => {
                        $("#sign-up-form").attr('class', 'ui error form')
                        $("#sign-up-error-message").text(res.message)
                        console.error(`login failed: status ${res.status} - ${res.message}`)
                    }
                })
            },
            error: (res) => {
                $("#sign-up-wait").attr('class', 'ui hidden message')
                $("#sign-up-form").attr('class', 'ui error form')
                $("#sign-up-error-message").text(res.message)
                console.error(`signup failed: status ${res.status} - ${res.message}`)
            }
        })
    })
})