$(document).ready(() => {
    console.log("getting users list")
    $.ajax({
        url: "/users/all",
        method: "GET",
        beforeSend: () => {
            // Update content
            while ($("#user-list").children().length > 1) {
                $("#user-list").children().last().remove()
            }

            // Make style adjustments
            $("#user-list").attr("class", "")
            $("#user-list-loader").attr("class", "ui active text loader")
            $("#user-list-error").attr('class', 'ui hidden error message')
        },
        success: (res) => {
            // Update content
            if (res.users.length > 0) {
                for (var user of res.users) {
                    item = `
                    <a href="/user/${user.username}">
                        <div class="user-item">
                            <h4 class="user-header">${user.username}</h4>
                        </div>
                    </a>`
                    $("#user-list").append(item)
                }
            } else {
                $("#user-list").append(`
                <div class="user-item">
                    <h2 class="user-header">No Users Found</h2>
                </div>`)
            }

            // Make style adjustments
            $("#user-list").attr("class", "")
            $("#user-list-loader").attr("class", "ui hidden text loader")
            $("#user-list-error").attr('class', 'ui hidden error message')
            console.log(`getting users succeeded: ${res.status}`)
        },
        error: (res) => {
            // Update content
            $("#user-list-error-message").text(res.message)

            // Make style adjustments
            $("#user-list").attr("class", "")
            $("#user-list-loader").attr("class", "ui hidden text loader")
            $("#user-list-error").attr('class', 'ui error message')
            console.error(`getting users failed: ${res.status} - ${res.message}`)
        }
    })
})