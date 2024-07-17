package vulcan.controllers;

import java.net.URI;
import java.net.http.HttpResponse;
import java.util.Collections;
import java.util.HashMap;

import io.opentracing.Span;
import io.opentracing.log.Fields;
import io.opentracing.tag.Tags;
import io.opentracing.util.GlobalTracer;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import vulcan.Helpers;

@Controller
public class Users {

	@RequestMapping(value = "/user/{username}", method = RequestMethod.GET)
	public String userPage(HttpServletRequest req, HttpServletResponse res, String username, Model model) {
		// Authorize
		String permissions = Helpers.authorize(req);
		switch (permissions) {
			case "admin":
				model.addAttribute("title", "User: " + username);
				res.setStatus(HttpServletResponse.SC_OK);
				return "user";

			case "user":
			case "none":
				try {
					res.setStatus(HttpServletResponse.SC_FOUND);
					res.sendRedirect("/login");
					return null;
				} catch (Exception e) {
					res.setStatus(HttpServletResponse.SC_NOT_FOUND);
					return "error";
				}

			default:
				model.addAttribute("title", "Error");
				model.addAttribute("message", "There was an issue with the Server, please try again later.");
				res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
				return "error";
		}
	}

	@RequestMapping(value = "/user/join", method = RequestMethod.GET)
	public String userPage(Model model) {
		model.addAttribute("title", "Join Vulcan");
		return "join";
	}

	@RequestMapping(value = "/user/create", method = RequestMethod.POST)
	public HashMap<String, Object> userCreateAPI(HttpServletRequest req, HttpServletResponse res) {
        // Function variables
        Span span = GlobalTracer.get().activeSpan();
        HashMap<String, Object> body = Helpers.decodeBody(req);
        HashMap<String, Object> output = new HashMap<>();
        Logger logger = LogManager.getLogger("vulcan");

        // Validate the user input
        if (!Helpers.validate(body)) {
            res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            output.put("message", "There was an issue with your request.");
            return output;
        }

        try {
            // Build user object
            HashMap<String, Object> user = new HashMap<>();
			user.put("username", body.get("username"));
            user.put("pwhash", body.get("username"));

            // Make user request
            HttpResponse<String> response = Helpers.httpPostRequest(new URI("https://user-manager:910/create"), user);

            // Handle user response
            switch (response.statusCode()) {
                case HttpServletResponse.SC_OK:
                    res.setStatus(HttpServletResponse.SC_OK);
                    logger.info("created user " + body.get("username"));
                    output.put("username", body.get("username"));
                    return output;

                default:
                    throw new Exception("VulcanError: unexpected response from user-manager");
            }
        } catch (Exception e) {
            res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            output.put("message", "There was an issue with the Server, please try again later.");

            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

            logger.error("vulcan encountered error during user creation: " + e.getMessage(), e);
            return output;
        }
	}

	@RequestMapping(value = "/user/delete", method = RequestMethod.POST)
	public HashMap<String, Object> userDeleteAPI(HttpServletRequest req, HttpServletResponse res) {
        // Function variables
        Span span = GlobalTracer.get().activeSpan();
        HashMap<String, Object> body = Helpers.decodeBody(req);
        HashMap<String, Object> output = new HashMap<>();
        Logger logger = LogManager.getLogger("vulcan");

        // Validate the user input
        if (!Helpers.validate(body)) {
            res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            output.put("message", "There was an issue with your request.");
            return output;
        }

        try {
            // Prep user request
            HashMap<String, Object> username = new HashMap<String, Object>();
            username.put("username", body.get("username"));

            // Make authorization request to authenticator service
            HttpResponse<String> response = Helpers.httpPostRequest(new URI("https://user-manager:910/delete"), username);

            // Handle response
            switch (response.statusCode()) {
                case HttpServletResponse.SC_OK:
                    res.setStatus(HttpServletResponse.SC_OK);
                    logger.info("deleted user " + body.get("username"));
                    output.put("message", "Successfully deleted user.");
                    return output;

                case HttpServletResponse.SC_NOT_FOUND:
                    res.setStatus(HttpServletResponse.SC_NOT_FOUND);
                    logger.info("user not found for username " + body.get("username"));
                    output.put("message", "Couldn't find a user with that username.");
                    return output;

                default:
                    throw new Exception("VulcanError: unexpected response from user-manager");
            }
        } catch (Exception e) {
            res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            output.put("message", "There was an issue with the Server, please try again later.");

            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

            logger.error("vulcan encountered error during user deletion: " + e.getMessage(), e);
            return output;
        }
    }
}