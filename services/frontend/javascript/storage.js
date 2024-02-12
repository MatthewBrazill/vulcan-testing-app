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



    $("#god-search-bar").keypress((e) => {
        if (e.which == '13') {
            e.preventDefault()
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
        }
    });



    $("#testing-log-input").keypress((e) => {
        if (e.which == '13') {
            e.preventDefault()
            var log = $("#testing-log-input").val()
            var method = $("#testing-log-dropdown").val()
            switch (method) {
                case "console":
                    console.log(log)
                    $("#testing-log-input").val("")
                    break

                case "datadog":
                    $("#testing-log-input").val("")
                    var logger = window.DD_LOGS && window.DD_LOGS.logger
                    logger.info(log)
                    break

                default:
                    alert(`Didn't recognize logging method: ${method}`)
                    throw new Error(`Didn't recognize logging method: ${method}`)
            }
        }
    });



    $("#testing-error-button").click(() => {
        $.ajax({
            url: "https://random-word-api.herokuapp.com/word?number=3",
            method: "GET",
            success: (res) => { throw new Error(`Example error: ${res[0]} - ${res[1]} - ${res[2]}`) },
            error: (res) => alert(`Request failed: ${res.status} - ${res.message}`)
        })
    })



    $("#testing-custom-event-button").click(() => {
        window.DD_RUM && window.DD_RUM.addAction("custom-testing-action", { "value": "testing" })
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