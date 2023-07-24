const url = new URL(window.location)
$(window).on("popstate", (e) => {
    $.ajax({
        url: "/storage/search",
        method: "POST",
        data: {
            filter: e.state.search
        },
        success: searchSuccess,
        error: searchError
    })
})

$(document).ready(() => {
    $.ajax({
        url: "/storage/search",
        method: "POST",
        data: {
            filter: url.searchParams.get("search")
        },
        success: searchSuccess,
        error: searchError
    })



    $("#god-search-button").click(() => {
        url.searchParams.set("search", $("#god-search-bar").val())
        window.history.pushState({ search: $("#god-search-bar").val() }, "", url);
        $.ajax({
            url: "/storage/search",
            method: "POST",
            data: {
                filter: $("#god-search-bar").val()
            },
            success: searchSuccess,
            error: searchError
        })
    })
})


function searchSuccess(res) {
    // Update content
    while ($("#god-list").children().length > 1) {
        $("#god-list").children().last().remove()
    }
    if (res.result.length > 0) {

        for (var god of res.result) {
            godItem = `
            <a href="/edit?godId=${god.godId}">
                <div id="${god.godId}" class="god-item">
                    <h2 class="god-header">${god.name}</h2>
                    <p class="god-meta">Domain: ${god.domain}, Pantheon: ${god.pantheon}</p>
                </div>
            </a>`
            $("#god-list").append(godItem)
        }
    } else {
        $("#god-list").append(`
        <div class="god-item">
            <h2 class="god-header">No Gods Found</h2>
        </div>`)
    }

    // Make style adjustments
    $("#god-list").attr("class", "")
    $("#god-list-error").attr('class', 'ui hidden error message')
}


function searchError(res) {
    // Update content
    $("#god-list-error-message").text(res.message)

    // Make style adjustments
    $("#god-list").attr("class", "")
    $("#god-list-error").attr('class', 'ui error message')
}