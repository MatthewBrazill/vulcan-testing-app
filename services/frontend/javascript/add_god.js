$(document).ready(() => {
    $("#add-god-form").submit((e) => {
        e.preventDefault()
        console.log("creating new god")
        $.ajax({
            url: "/gods/create",
            method: "POST",
            data: {
                pantheon: $("#add-god-pantheon").val(),
                name: $("#add-god-name").val(),
                domain: $("#add-god-domain").val()
            },
            beforeSend: () => $("#add-god-loader").attr("class", "loader loader-active"),
            success: (res) => {
                window.location = "/storage"
                console.log(`god addition succeeded: status ${res.status}`)
            },
            error: (res) => {
                $("#add-god-form").attr('class', 'form form-error')
                $("#add-god-error-message").text(res.message)
                $("#add-god-loader").attr("class", "loader")
                console.error(`god addition failed: ${res.status} - ${res.message}`)
            }
        })
    })
})