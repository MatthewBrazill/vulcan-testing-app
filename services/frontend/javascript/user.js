console.log("getting user notes")
$.ajax({
    url: `${window.location.pathname}/notes`,
    method: "GET",
    success: (res) => {
        // Update content
        if (res.notes.length > 0) {
            $("#no-user-notes").hide()
            for (var note of res.notes) {
                $("#selected-user-notes").append(`<li>${note}</li>`)
            }
        }
        console.log(`getting notes succeeded: ${res.status}`)
    },
    error: (res) => console.error(`getting notes failed: ${res.status} - ${res.message}`)
})

$(document).ready(() => loadUsers())
function loadUsers() {
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
                    <div class="user-item" data-username="${user.username}">
                        <h3 class="user-header">
                            <div>${user.username}</div>
                            <button class="ui small red icon delete-user button" data-username="${user.username}"><i class="ui trash icon"></i></button>
                        </h3>
                    </div>`
                    $("#user-list").append(item)
                }
            } else {
                $("#user-list").append(`
                <div class="user-item">
                    <h2 class="user-header">No Users Found</h2>
                </div>`)
            }

            // Attach delete button and link logic
            $(".user-item").click((e) => {
                var target = $(e.currentTarget)
                while (!target.hasClass("user-item") && !target.hasClass("delete-user")) target = target.parent()
                if (target.hasClass("delete-user")) {
                    $.ajax({
                        url: "/user/delete",
                        method: "POST",
                        data: {
                            username: target.data("username")
                        },
                        success: () => {
                            console.log(`deleting user succeeded: ${res.status}`)
                            console.log("reloading users")
                            loadUsers()
                        },
                        error: (res) => console.error(`deleting user failed: ${res.status} - ${res.message}`)
                    })
                } else {
                    window.location = `/user/${target.data("username")}`
                }
            })

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
}