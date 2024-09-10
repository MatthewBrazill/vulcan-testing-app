package vulcan.controllers;

import java.net.URI;
import java.net.http.HttpResponse;
import java.util.Collections;
import java.util.HashMap;
import java.util.Random;
import java.lang.reflect.Type;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import io.opentracing.Span;
import io.opentracing.log.Fields;
import io.opentracing.tag.Tags;
import io.opentracing.util.GlobalTracer;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import vulcan.Helpers;

@Controller
public class Gods {
    @ResponseBody
    @RequestMapping(value = "/gods/create", method = RequestMethod.POST)
    public HashMap<String, Object> godCreateAPI(HttpServletRequest req, HttpServletResponse res) {
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
            // Generate GodID
            String godId = "";
            for (int i = 0; i < 5; i++) {
                String chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
                Random rand = new Random();

                char selected = chars.charAt(rand.nextInt(62));
                godId = godId + selected;
            }
            logger.debug("generated god id " + godId);

            // Build god object
            HashMap<String, Object> god = new HashMap<>();
            god.put("godId", godId);
            god.put("name", body.get("name"));
            god.put("pantheon", body.get("pantheon"));
            god.put("domain", body.get("domain"));

            // Make god request
            HttpResponse<String> response = Helpers.httpPostRequest(new URI("https://god-manager.vulcan-application.svc.cluster.local/create"), god);

            // Handle god response
            switch (response.statusCode()) {
                case HttpServletResponse.SC_OK:
                    res.setStatus(HttpServletResponse.SC_OK);
                    logger.info("created god " + godId);
                    output.put("godId", godId);
                    return output;

                default:
                    throw new Exception("VulcanError: unexpected response from god-manager");
            }
        } catch (Exception e) {
            res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            output.put("message", "There was an issue with the Server, please try again later.");

            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

            logger.error("vulcan encountered error during god creation: " + e.getMessage(), e);
            return output;
        }
    }

    @ResponseBody
    @RequestMapping(value = "/gods/get", method = RequestMethod.POST)
    public HashMap<String, Object> godGetAPI(HttpServletRequest req, HttpServletResponse res) {
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
            // Prep god request
            HashMap<String, Object> godId = new HashMap<String, Object>();
            godId.put("godId", body.get("godId"));

            // Make god request
            HttpResponse<String> response = Helpers.httpPostRequest(new URI("https://god-manager.vulcan-application.svc.cluster.local/get"), godId);

            // Handle response
            switch (response.statusCode()) {
                case HttpServletResponse.SC_OK:
                    res.setStatus(HttpServletResponse.SC_OK);
                    logger.info("got god " + body.get("godId"));

                    // Extract HashMap from JSON body
                    Gson gson = new Gson();
                    Type type = new TypeToken<HashMap<String, String>>() {}.getType();
                    HashMap<String, Object> god = gson.fromJson(response.body(), type);

                    god.remove("_id");
                    return god;

                case HttpServletResponse.SC_NOT_FOUND:
                    res.setStatus(HttpServletResponse.SC_NOT_FOUND);
                    logger.info("god not found for id " + body.get("godId"));
                    output.put("message", "Couldn't find a god with that ID.");
                    return output;

                default:
                    throw new Exception("VulcanError: unexpected response from god-manager");
            }
        } catch (Exception e) {
            res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            output.put("message", "There was an issue with the Server, please try again later.");

            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

            logger.error("vulcan encountered error during god retrieval: " + e.getMessage(), e);
            return output;
        }
    }

    @ResponseBody
    @RequestMapping(value = "/gods/update", method = RequestMethod.POST)
    public HashMap<String, Object> godUpdateAPI(HttpServletRequest req, HttpServletResponse res) {
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
            // Build god object
            HashMap<String, Object> god = new HashMap<>();
            god.put("godId", body.get("godId"));
            god.put("name", body.get("name"));
            god.put("pantheon", body.get("pantheon"));
            god.put("domain", body.get("domain"));
            logger.debug("creating updated god object");

            // Make god request
            HttpResponse<String> response = Helpers.httpPostRequest(new URI("https://god-manager.vulcan-application.svc.cluster.local/update"), god);

            // Handle god response
            switch (response.statusCode()) {
                case HttpServletResponse.SC_OK:
                    res.setStatus(HttpServletResponse.SC_OK);
                    logger.info("updated god " + body.get("godId"));
                    output.put("message", "Successfully updated god.");
                    return output;

                case HttpServletResponse.SC_NOT_FOUND:
                    res.setStatus(HttpServletResponse.SC_NOT_FOUND);
                    logger.info("god not found for id " + body.get("godId"));
                    output.put("message", "Couldn't find a god with that ID.");
                    return output;

                default:
                    throw new Exception("VulcanError: unexpected response from god-manager");
            }
        } catch (Exception e) {
            res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            output.put("message", "There was an issue with the Server, please try again later.");

            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

            logger.error("vulcan encountered error during god update: " + e.getMessage(), e);
            return output;
        }
    }

    @ResponseBody
    @RequestMapping(value = "/gods/delete", method = RequestMethod.POST)
    public HashMap<String, Object> godDeleteAPI(HttpServletRequest req, HttpServletResponse res) {
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
            // Prep god request
            HashMap<String, Object> godId = new HashMap<String, Object>();
            godId.put("godId", body.get("godId"));

            // Make authorization request to authenticator service
            HttpResponse<String> response = Helpers.httpPostRequest(new URI("https://god-manager.vulcan-application.svc.cluster.local/delete"), godId);

            // Handle response
            switch (response.statusCode()) {
                case HttpServletResponse.SC_OK:
                    res.setStatus(HttpServletResponse.SC_OK);
                    logger.info("deleted god " + body.get("godId"));
                    output.put("message", "Successfully deleted god.");
                    return output;

                case HttpServletResponse.SC_NOT_FOUND:
                    res.setStatus(HttpServletResponse.SC_NOT_FOUND);
                    logger.info("god not found for id " + body.get("godId"));
                    output.put("message", "Couldn't find a god with that ID.");
                    return output;

                default:
                    throw new Exception("VulcanError: unexpected response from god-manager");
            }
        } catch (Exception e) {
            res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            output.put("message", "There was an issue with the Server, please try again later.");

            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

            logger.error("vulcan encountered error during god deletion: " + e.getMessage(), e);
            return output;
        }
    }
}
