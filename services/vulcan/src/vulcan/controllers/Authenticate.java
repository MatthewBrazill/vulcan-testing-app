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
import org.springframework.web.bind.annotation.ResponseBody;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import vulcan.Helpers;

@Controller
public class Authenticate {

    @RequestMapping(value = "/login", method = RequestMethod.GET)
    public String loginPage(HttpServletRequest req, Model model) {
        // Function variables
        Logger logger = LogManager.getLogger("vulcan");
        HashMap<String, Object> body = Helpers.decodeBody(req);

        // Log out user
        req.getSession().invalidate();
        logger.info(body.get("username") + " logged out");

        model.addAttribute("title", "Login Page");
        return "login";
    }

    @ResponseBody
    @RequestMapping(value = "/login", method = RequestMethod.POST)
    public HashMap<String, Object> loginAPI(HttpServletRequest req, HttpServletResponse res) {
        // Function variables
        Span span = GlobalTracer.get().activeSpan();
        HashMap<String, Object> body = Helpers.decodeBody(req);
        HashMap<String, Object> output = new HashMap<String, Object>();
        Logger logger = LogManager.getLogger("vulcan");

        try {
            // Validate the user input
            if (!Helpers.validate(body)) {
                res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                output.put("message", "There was an issue with your request.");
                return output;
            }

            // Generate the authorization request body
            HashMap<String, Object> auth = new HashMap<String, Object>();
            auth.put("username", body.get("username"));
            // auth.put("pwHash", DigestUtils.sha256Hex(body.get("password").toString()));
            auth.put("pwHash", body.get("password"));

            // Make authentication request to authenticator service
            HttpResponse<String> response = Helpers.httpPostRequest(new URI("https://authenticator:2884/authenticate"), auth);

            // Handle response
            switch (response.statusCode()) {
                case HttpServletResponse.SC_OK:
                    res.setStatus(HttpServletResponse.SC_OK);
                    req.getSession().setAttribute("username", body.get("username"));
                    output.put("message", "Successfully logged in.");
                    logger.info(body.get("username") + " logged in");
                    return output;

                case HttpServletResponse.SC_UNAUTHORIZED:
                    res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    output.put("message", "Your login details are incorrect.");
                    logger.info(body.get("username") + " failed to log in");
                    return output;

                default:
                    throw new Exception("VulcanError: couldn't authorize request");
            }
        } catch (Exception e) {
            res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            output.put("message", "There was an issue with the Server, please try again later.");

            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

            return output;
        }
    }

    @RequestMapping(value = "/logout", method = RequestMethod.GET)
    public void logoutAPI(HttpServletRequest req, HttpServletResponse res) {
        // Function variables
        Logger logger = LogManager.getLogger("vulcan");
        HashMap<String, Object> body = Helpers.decodeBody(req);

        // Log out user
        req.getSession().invalidate();
        logger.info(body.get("username") + " logged out");
        res.setStatus(HttpServletResponse.SC_OK);
    }
}