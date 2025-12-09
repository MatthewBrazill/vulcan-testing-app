const url = new URL(window.location)
$(window).on("popstate", (e) => {
    console.log("recovering previous search")
    $.ajax({
        url: "/storage/search",
        method: "POST",
        data: {
            query: e.state.search
        },
        beforeSend: searchWait,
        success: searchSuccess,
        error: searchError
    })
})

$(document).ready(() => {
    console.log(`matching search to url: ${url.search}`)
    $.ajax({
        url: "/storage/search",
        method: "POST",
        data: {
            query: url.searchParams.get("search")
        },
        beforeSend: searchWait,
        success: searchSuccess,
        error: searchError
    }).then()



    $("#god-search-bar").keypress((e) => {
        if (e.which == '13') {
            console.log(`searching for gods: ${$("#god-search-bar").val()}`)
            e.preventDefault()
            url.searchParams.set("search", $("#god-search-bar").val())
            window.history.pushState({ search: $("#god-search-bar").val() }, "", url);
            $.ajax({
                url: "/storage/search",
                method: "POST",
                data: {
                    query: $("#god-search-bar").val()
                },
                beforeSend: searchWait,
                success: searchSuccess,
                error: searchError
            })
        }
    });



    $("#divination-input").keypress((e) => {
        if (e.which == '13') {
            console.log(`asking for a prediction for: ${$("#divination-input").val()}`)
            e.preventDefault()
            $.ajax({
                url: "/oracle/predict",
                method: "POST",
                data: {
                    question: $("#divination-input").val(),
                    oracle: $("#divination-dropdown").val(),
                },
                beforeSend: () => {
                    $("#divination-output").attr("class", "")
                    $("#divination-output-loader").attr("class", "ui active centered inline text loader")
                    $("#divination-output-text").attr("class", "ui hidden")
                },
                success: (res) => {
                    $("#divination-output").attr("class", "")
                    $("#divination-output-loader").attr("class", "ui hidden centered inline text loader")
                    $("#divination-output-text").text(res.prediction)
                    $("#divination-output-text").attr("class", "ui active")
                },
                error: (res) => {
                    $("#divination-output").attr("class", "")
                    $("#divination-output-loader").attr("class", "ui hidden centered inline text loader")
                    $("#divination-output-text").text(res.prediction)
                    $("#divination-output-text").attr("class", "ui active")
                }
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
                    console.error(`unrecognized logging method: ${method}`)
                    throw new Error(`Didn't recognize logging method: ${method}`)
            }
        }
    });



    $("#testing-error-button").click(() => {
        console.log("generating testing error")
        $.ajax({
            url: "https://random-word-api.herokuapp.com/word?number=3",
            method: "GET",
            success: (res) => { throw new Error(`Example error: ${res[0]} - ${res[1]} - ${res[2]}`) },
            error: (res) => console.error(`error request failed: ${res.status} - ${res.message}`)
        })
    })



    $("#testing-custom-event-button").click(() => {
        console.warn("warning for custom action button")
        window.DD_RUM && window.DD_RUM.addAction("custom-testing-action", { "value": "testing" })
    })
})


function searchWait(req) {
    // Update content
    while ($("#god-list").children().length > 2) {
        $("#god-list").children().last().remove()
    }

    // Make style adjustments
    $("#god-list").attr("class", "")
    $("#god-list-loader").attr("class", "ui active centered inline text loader")
    $("#god-list-error").attr('class', 'ui hidden error message')
}


function searchSuccess(res) {
    // Update content
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
    $("#god-list-loader").attr("class", "ui hidden centered inline text loader")
    $("#god-list-error").attr('class', 'ui hidden error message')
    console.log(`search succeeded: ${res.status}`)
}


function searchError(res) {
    // Update content
    $("#god-list-error-message").text(res.message)

    // Make style adjustments
    $("#god-list").attr("class", "")
    $("#god-list-loader").attr("class", "ui hidden centered inline text loader")
    $("#god-list-error").attr('class', 'ui error message')
    console.error(`search failed: ${res.status} - ${res.message}`)
}