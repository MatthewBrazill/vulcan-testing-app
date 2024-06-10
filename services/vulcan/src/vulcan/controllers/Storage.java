package vulcan.controllers;

import java.util.ArrayList;
import java.util.HashMap;

import org.bson.Document;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import com.mongodb.client.MongoCursor;
import com.mongodb.client.model.Filters;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import vulcan.Databases;
import vulcan.Helpers;

@Controller
public class Storage {
    @RequestMapping(value = "/storage", method = RequestMethod.GET)
    public String storagePage(HttpServletRequest req, HttpServletResponse res, Model model) {
        String permissions = Helpers.authorize(req);
        switch (permissions) {
            case "user":
            case "admin":
                model.addAttribute("title", "God Storage");
                model.addAttribute("language", "Java");
                res.setStatus(HttpServletResponse.SC_OK);
                return "storage";

            case "none":
                try {
                    res.setStatus(HttpServletResponse.SC_FOUND);
                    res.sendRedirect("/login");
                    return null;
                } catch (Exception e) {}

            default:
                model.addAttribute("title", "Error");
                model.addAttribute("language", "Java");
                model.addAttribute("message", "There was an issue with the Server, please try again later.");
                res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                return "error";
        }
    }

    @RequestMapping(value = "/add", method = RequestMethod.GET)
    public String addGodPage(HttpServletRequest req, HttpServletResponse res, Model model) {
        String permissions = Helpers.authorize(req);
        switch (permissions) {
            case "user":
            case "admin":
                model.addAttribute("title", "Add God");
                model.addAttribute("language", "Java");
                res.setStatus(HttpServletResponse.SC_OK);
                return "add_god";

            case "none":
                try {
                    res.setStatus(HttpServletResponse.SC_FOUND);
                    res.sendRedirect("/login");
                    return null;
                } catch (Exception e) {}

            default:
                model.addAttribute("title", "Error");
                model.addAttribute("language", "Java");
                model.addAttribute("message", "There was an issue with the Server, please try again later.");
                res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                return "error";
        }
    }

    @RequestMapping(value = "/edit", method = RequestMethod.GET)
    public String editGodPage(HttpServletRequest req, HttpServletResponse res, Model model) {
        String permissions = Helpers.authorize(req);
        switch (permissions) {
            case "user":
            case "admin":
                model.addAttribute("title", "Edit God");
                model.addAttribute("language", "Java");
                res.setStatus(HttpServletResponse.SC_OK);
                return "edit_god";

            case "none":
                try {
                    res.setStatus(HttpServletResponse.SC_FOUND);
                    res.sendRedirect("/login");
                    return null;
                } catch (Exception e) {}

            default:
                model.addAttribute("title", "Error");
                model.addAttribute("language", "Java");
                model.addAttribute("message", "There was an issue with the Server, please try again later.");
                res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                return "error";
        }
    }

    @ResponseBody
    @RequestMapping(value = "/storage/search", method = RequestMethod.POST)
    public HashMap<String, Object> storageSearchAPI(HttpServletRequest req, HttpServletResponse res) {
        String permissions = Helpers.authorize(req);
        String[][] params = { { "filter", "[a-zA-Z]{0,32}" } };
        HashMap<String, Object> reqBody = Helpers.decodeBody(req);
        HashMap<String, Object> resBody = new HashMap<String, Object>();

        switch (permissions) {
            case "user":
            case "admin":
                // Validate the user input
                if (!Helpers.validate(body)) {
                    res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    resBody.put("message", "There was an issue with your request.");
                    return resBody;
                }
 
                ArrayList<Document> gods = new ArrayList<Document>();
                MongoCursor<Document> result = Databases.godDatabse().find(Filters.regex("name", reqBody.get("filter").toString(), "i")).cursor();
                for (int i = 0; result.hasNext(); i++) {
                    Document god = result.next();
                    god.remove("_id");
                    gods.add(i, god);
                }

                resBody.put("message", "Successfully filtered gods.");
                resBody.put("result", gods);
                return resBody;

            case "none":
                res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                resBody.put("message", "Your credentials are invalid.");
                return resBody;

            default:
                res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                resBody.put("message", "There was an issue with the Server, please try again later.");
                return resBody;
        }
    }
}
