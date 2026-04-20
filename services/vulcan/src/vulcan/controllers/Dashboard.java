package vulcan.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import vulcan.Helpers;

@Controller
public class Dashboard {

    @RequestMapping(value = "/dashboard", method = RequestMethod.GET)
    public String dashboardPage(HttpServletRequest req, HttpServletResponse res, Model model) {
        model.addAttribute("env", System.getenv("DD_ENV"));
        model.addAttribute("version", System.getenv("FRONTEND_VERSION"));
        String permissions = Helpers.authorize(req);
        switch (permissions) {
            case "user":
            case "admin":
                model.addAttribute("title", "Dashboard");
                res.setStatus(HttpServletResponse.SC_OK);
                return "dashboard";

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
}
