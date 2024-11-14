const url = new URL(window.location)
$(document).ready(() => {
    console.log("getting god")
    $.ajax({
        url: "/gods/get",
        method: "POST",
        data: { godId: url.searchParams.get("godId") },
        success: (res) => {
            $("#edit-god-pantheon").val(res.pantheon)
            $("#edit-god-name").val(res.name)
            $("#edit-god-domain").val(res.domain)
            console.log(`god collection succeeded: status ${res.status}`)
        },
        error: (res) => {
            $("#edit-god-form").attr("class", "ui error form")
            $("#edit-god-error-message").text("Failed to get a god for this ID.")
            console.error(`god collection failed: ${res.status} - ${res.message}`)
        }
    })

    $("#edit-god-form").submit((e) => {
        e.preventDefault()
        console.log("editing god")
        $.ajax({
            url: "/gods/update",
            method: "POST",
            data: {
                godId: url.searchParams.get("godId"),
                pantheon: $("#edit-god-pantheon").val(),
                name: $("#edit-god-name").val(),
                domain: $("#edit-god-domain").val()
            },
            success: (res) => {
                window.location = "/storage"
                console.log(`god edit succeeded: status ${res.status}`)
            },
            error: (res) => {
                $("#edit-god-form").attr("class", "ui error form")
                $("#edit-god-error-message").text(res.message)
                console.error(`god edit failed: ${res.status} - ${res.message}`)
            }
        })
    })

    $("#delete-god-button").click(() => {
        console.log("deleting god")
        $.ajax({
            url: "/gods/delete",
            method: "POST",
            data: { godId: url.searchParams.get("godId") },
            success: (res) => {
                window.location = "/storage"
                console.log(`god deletion succeeded: status ${res.status}`)
            },
            error: (res) => {
                $("#edit-god-form").attr("class", "ui error form")
                $("#edit-god-error-message").text(res.message)
                console.error(`god deletion failed: ${res.status} - ${res.message}`)
            }
        })
    })
})