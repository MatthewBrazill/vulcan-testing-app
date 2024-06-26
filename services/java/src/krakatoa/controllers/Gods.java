package krakatoa.controllers;

import java.util.Collections;
import java.util.HashMap;
import java.util.Random;

import org.bson.Document;
import org.bson.conversions.Bson;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import com.mongodb.client.result.DeleteResult;
import com.mongodb.client.result.InsertOneResult;
import com.mongodb.client.result.UpdateResult;

import io.opentracing.Span;
import io.opentracing.log.Fields;
import io.opentracing.tag.Tags;
import io.opentracing.util.GlobalTracer;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import krakatoa.Databases;
import krakatoa.Helpers;

@Controller
public class Gods {
    @ResponseBody
    @RequestMapping(value = "/gods/create", method = RequestMethod.POST)
    public HashMap<String, Object> godCreateAPI(HttpServletRequest req, HttpServletResponse res) {
        String[][] params = { { "pantheon", "^[a-zA-Z]{1,32}$" }, { "name", "^[a-zA-Z]{1,32}$" }, { "domain", "^[0-9a-zA-Z ]{1,32}$" } };
        HashMap<String, Object> reqBody = Helpers.decodeBody(req);
        HashMap<String, Object> resBody = new HashMap<String, Object>();
        Span span = GlobalTracer.get().activeSpan();

        if (!Helpers.validate(req, params)) {
            res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resBody.put("message", "There was an issue with your request.");
            return resBody;
        }

        try {
            String godId = "";
            for (int i = 0; i < 5; i++) {
               String chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
               Random rand = new Random();

               char selected = chars.charAt(rand.nextInt(62));
               godId = godId + selected;
            }

            Document god = new Document();
            god.append("godId", godId).append("name", reqBody.get("name")).append("pantheon", reqBody.get("pantheon")).append("domain", reqBody.get("domain"));
            InsertOneResult result = Databases.godDatabse().insertOne(god);

            if (result.wasAcknowledged()) {
                res.setStatus(HttpServletResponse.SC_OK);
                resBody.put("message", "Successfully created god.");
                resBody.put("godId", godId);
                return resBody;
            } else {
                res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                resBody.put("message", "Failed to create god. There was an issue with the Server, please try again later.");
                return resBody;
            }
        } catch (Exception e) {
			res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
			resBody.put("message", "There was an issue with the Server, please try again later.");

			span.setTag(Tags.ERROR, true);
			span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

			return resBody;
        }
    }

    @ResponseBody
    @RequestMapping(value = "/gods/get", method = RequestMethod.POST)
    public HashMap<String, Object> godGetAPI(HttpServletRequest req, HttpServletResponse res) {
        String[][] params = { { "godId", "^[a-zA-Z0-9]{5}$" } };
        HashMap<String, Object> reqBody = Helpers.decodeBody(req);
        HashMap<String, Object> resBody = new HashMap<String, Object>();
        Span span = GlobalTracer.get().activeSpan();

        if (!Helpers.validate(req, params)) {
            res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resBody.put("message", "There was an issue with your request.");
            return resBody;
        }

        try {
            Document result = Databases.godDatabse().find(Filters.eq("godId", reqBody.get("godId"))).first();

            if (result != null) {
                result.remove("_id");
                res.setStatus(HttpServletResponse.SC_OK);
                resBody.put("message", "Successfully retreived god.");
                resBody.put("god", result);
                return resBody;
            } else {
                res.setStatus(HttpServletResponse.SC_NOT_FOUND);
                resBody.put("message", "Couldn't find a god with that ID.");
                return resBody;
            }
        } catch (Exception e) {
			res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
			resBody.put("message", "There was an issue with the Server, please try again later.");

			span.setTag(Tags.ERROR, true);
			span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

			return resBody;
        }
    }

    @ResponseBody
    @RequestMapping(value = "/gods/update", method = RequestMethod.POST)
    public HashMap<String, Object> godUpdateAPI(HttpServletRequest req, HttpServletResponse res) {
        String[][] params = { { "godId", "^[a-zA-Z0-9]{5}$" }, { "pantheon", "^[a-zA-Z]{1,32}$" }, { "name", "^[a-zA-Z]{1,32}$" }, { "domain", "^[0-9a-zA-Z ]{1,32}$" } };
        HashMap<String, Object> reqBody = Helpers.decodeBody(req);
        HashMap<String, Object> resBody = new HashMap<String, Object>();
        Span span = GlobalTracer.get().activeSpan();

        if (!Helpers.validate(req, params)) {
            res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resBody.put("message", "There was an issue with your request.");
            return resBody;
        }

        try {
            Bson update = Updates.combine(
                    Updates.set("name", reqBody.get("name")),
                    Updates.set("pantheon", reqBody.get("pantheon")),
                    Updates.set("domain", reqBody.get("domain")));
            UpdateResult result = Databases.godDatabse().updateOne(Filters.eq("godId", reqBody.get("godId")), update);

            if (result.getModifiedCount() > 0) {
                res.setStatus(HttpServletResponse.SC_OK);
                resBody.put("message", "Successfully updated god.");
                return resBody;
            } else {
                res.setStatus(HttpServletResponse.SC_NOT_FOUND);
                resBody.put("message", "Couldn't find a god with that ID.");
                return resBody;
            }
        } catch (Exception e) {
			res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
			resBody.put("message", "There was an issue with the Server, please try again later.");

			span.setTag(Tags.ERROR, true);
			span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

			return resBody;
        }
    }

    @ResponseBody
    @RequestMapping(value = "/gods/delete", method = RequestMethod.POST)
    public HashMap<String, Object> godDeleteAPI(HttpServletRequest req, HttpServletResponse res) {
        String[][] params = { { "godId", "^[a-zA-Z0-9]{5}$" } };
        HashMap<String, Object> reqBody = Helpers.decodeBody(req);
        HashMap<String, Object> resBody = new HashMap<String, Object>();
        Span span = GlobalTracer.get().activeSpan();

        if (!Helpers.validate(req, params)) {
            res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resBody.put("message", "There was an issue with your request.");
            return resBody;
        }

        try {
            DeleteResult result = Databases.godDatabse().deleteOne(Filters.eq("godId", reqBody.get("godId")));

            if (result.getDeletedCount() > 0) {
                res.setStatus(HttpServletResponse.SC_OK);
                resBody.put("message", "Successfully deleted god.");
                resBody.put("god", result);
                return resBody;
            } else {
                res.setStatus(HttpServletResponse.SC_NOT_FOUND);
                resBody.put("message", "Couldn't find a god with that ID.");
                return resBody;
            }
        } catch (Exception e) {
			res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
			resBody.put("message", "There was an issue with the Server, please try again later.");

			span.setTag(Tags.ERROR, true);
			span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

			return resBody;
        }
    }
}
