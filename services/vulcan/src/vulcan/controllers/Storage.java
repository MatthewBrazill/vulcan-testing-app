package vulcan.controllers;

import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import io.opentracing.Span;
import io.opentracing.log.Fields;
import io.opentracing.tag.Tags;
import io.opentracing.util.GlobalTracer;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import vulcan.Helpers;

@Controller
public class Storage {
    @RequestMapping(value = "/storage", method = RequestMethod.GET)
    public String storagePage(HttpServletRequest req, HttpServletResponse res, Model model) {
        // Authorize
        String permissions = Helpers.authorize(req);
        switch (permissions) {
            case "user":
            case "admin":
                model.addAttribute("title", "God Storage");
                res.setStatus(HttpServletResponse.SC_OK);
                return "storage";

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

    @RequestMapping(value = "/add", method = RequestMethod.GET)
    public String addGodPage(HttpServletRequest req, HttpServletResponse res, Model model) {
        // Authorize
        String permissions = Helpers.authorize(req);
        switch (permissions) {
            case "user":
            case "admin":
                model.addAttribute("title", "Add God");
                res.setStatus(HttpServletResponse.SC_OK);
                return "add_god";

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

    @RequestMapping(value = "/edit", method = RequestMethod.GET)
    public String editGodPage(HttpServletRequest req, HttpServletResponse res, Model model) {
        // Authorize
        String permissions = Helpers.authorize(req);
        switch (permissions) {
            case "user":
            case "admin":
                model.addAttribute("title", "Edit God");
                res.setStatus(HttpServletResponse.SC_OK);
                return "edit_god";

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

    @ResponseBody
    @RequestMapping(value = "/storage/search", method = RequestMethod.POST)
    public HashMap<String, Object> storageSearchAPI(HttpServletRequest req, HttpServletResponse res) {
        // Function variables
        Span span = GlobalTracer.get().activeSpan();
        HashMap<String, Object> body = Helpers.decodeBody(req);
        HashMap<String, Object> output = new HashMap<String, Object>();

        // Authorize
        String permissions = Helpers.authorize(req);
        switch (permissions) {
            case "user":
            case "admin":
                // Validate the user input
                if (!Helpers.validate(body)) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    output.put("message", "There was an issue with your request.");
                    return output;
                }

                try {
                    // Prep god request
                    HashMap<String, Object> godSearch = new HashMap<String, Object>();
                    godSearch.put("query", body.get("query"));

                    // Make god request
                    HttpResponse<String> response = Helpers.httpPostRequest(new URI("https://god-manager:900/search"), godSearch);

                    // Handle response
                    switch (response.statusCode()) {
                        case HttpServletResponse.SC_OK:
                            res.setStatus(HttpServletResponse.SC_OK);

                            // Extract ArrayList from JSON body
                            Gson gson = new Gson();
                            Type type = new TypeToken<ArrayList<HashMap<String, String>>>() {}.getType();
                            ArrayList<HashMap<String, String>> gods = gson.fromJson(response.body(), type);

                            // Clean MongoDB ID out of the response
                            for (HashMap<String, String> god : gods) {
                                god.remove("_id");
                            }

                            output.put("result", gods);
                            return output;

                        case HttpServletResponse.SC_NOT_FOUND:
                            output.put("result", "[]");
                            return output;

                        case HttpServletResponse.SC_INTERNAL_SERVER_ERROR:
                            throw new Exception("VulcanError: 500 response from god-manager");

                        default:
                            throw new Exception("VulcanError: unexpected response from god-manager");
                    }
                } catch (Exception e) {
                    res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    output.put("message", "There was an issue with the Server, please try again later.");

                    span.setTag(Tags.ERROR, true);
                    span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

                    return output;
                }

            case "none":
                res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                output.put("message", "Your credentials are invalid.");
                return output;

            default:
                res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                output.put("message", "There was an issue with the Server, please try again later.");
                return output;
        }
    }
}
