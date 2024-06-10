const url = new URL(window.location)
$(document).ready(() => {
    $.ajax({
        url: "/gods/get",
        method: "POST",
        data: { godId: url.searchParams.get("godId") },
        success: (res) => {
            $("#edit-god-pantheon").val(res.pantheon),
            $("#edit-god-name").val(res.name),
            $("#edit-god-domain").val(res.domain)
        },
        error: (res) => {
            $("#edit-god-form").attr("class", "ui error form")
            $("#edit-god-error-message").text("Failed to get a god for this ID.")
        }
    })

    $("#edit-god-form").submit((e) => {
        e.preventDefault()
        $.ajax({
            url: "/gods/update",
            method: "POST",
            data: {
                godId: url.searchParams.get("godId"),
                pantheon: $("#edit-god-pantheon").val(),
                name: $("#edit-god-name").val(),
                domain: $("#edit-god-domain").val()
            },
            success: () => window.location = "/storage",
            error: (res) => {
                $("#edit-god-form").attr("class", "ui error form")
                $("#edit-god-error-message").text(res.message)
            }
        })
    })

    $("#delete-god-button").click(() => {
        $.ajax({
            url: "/gods/delete",
            method: "POST",
            data: { godId: url.searchParams.get("godId") },
            success: () => window.location = "/storage",
            error: (res) => {
                $("#edit-god-form").attr("class", "ui error form")
                $("#edit-god-error-message").text(res.message)
            }
        })
    })
})