$(document).ready(() => {
    $("#add-god-form").submit((e) => {
        e.preventDefault()
        $.ajax({
            url: "/gods/create",
            method: "POST",
            data: {
                pantheon: $("#add-god-pantheon").val(),
                name: $("#add-god-name").val(),
                domain: $("#add-god-domain").val()
            },
            success: () => window.location = "/storage",
            error: (res) => {
                $("#add-god-form").attr('class', 'ui error form')
                $("#add-god-error-message").text(res.message)
            }
        })
    })
})