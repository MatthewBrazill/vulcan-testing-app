$(document).ready(() => {

    // Init accordion
    $("#vault-box").accordion()

    // Set up character delete button
    $("a.card").on("click", function(event) {
        const card = $(this)
        const button = card.find("button")
        const gameType = card.attr("class").split(" ")[1]

        if (card.attr("class").split(" ")[0] == "newChar") {
            $.ajax({
                url: "/api/create",
                method: "POST",
                data: { type: gameType },
                success: (res) => window.location = `/vault/${res.charId}`
            })
        } else if (button.is(event.target) || button.children().is(event.target)) {
            $.ajax({
                url: "/api/delete",
                method: "POST",
                data: { charId: card.attr("id") },
                success: () => card.remove()
            })
        } else window.location = `/vault/${card.attr("id")}`
    })
})