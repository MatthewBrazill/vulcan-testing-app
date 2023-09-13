package vulcan;

import java.io.Reader;
import java.sql.ResultSet;
import java.util.Collections;
import java.util.HashMap;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import io.opentracing.Span;
import io.opentracing.log.Fields;
import io.opentracing.tag.Tags;
import io.opentracing.util.GlobalTracer;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import datadog.trace.api.Trace;

public class Helpers {

    public static Boolean validate(HttpServletRequest req, String[][] patterns) {
        return true;
    }

    @Trace(operationName = "vulcan.helper", resourceName = "Helpers.authenticate")
    public static String authenticate(HttpServletRequest req) {
        HttpSession session = req.getSession();
        Span span = GlobalTracer.get().activeSpan();
        ResultSet result;

        try {
            if (req.getHeader("api-key") != null) {
                result = Databases.userDatabase().executeQuery("SELECT * FROM apikeys WHERE apikey = '" + req.getHeader("api-key") + "'");
            } else if (session.getAttribute("username") != null) {
                result = Databases.userDatabase().executeQuery("SELECT * FROM users WHERE username = '" + session.getAttribute("username") + "'");
            } else return "no_auth";

            if (result.first()) return result.getString("permissions");
            else return "no_auth";
        } catch (Exception e) {
            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));
            return "error";
        }
    }

    @Trace(operationName = "vulcan.helper", resourceName = "Helpers.decodeBody")
    public static HashMap<String, Object> decodeBody(HttpServletRequest req) {
        HashMap<String, Object> output = new HashMap<String, Object>();
        Span span = GlobalTracer.get().activeSpan();

        try {
            if (req.getReader().ready()) {
                String contentType = req.getContentType().split(";")[0];
                switch (contentType) {
                    case "application/x-www-form-urlencoded":
                        String[] body = req.getReader().readLine().split("&");
                        for (int i = 0; i < body.length; i++) {
                            String[] attribute = body[i].split("=");
                            if (attribute[1] != "") {
                                output.put(attribute[0], attribute[1]);
                            }
                        }
                        break;

                    case "application/json":
                        Reader json = req.getReader();
                        Gson gson = new Gson();
                        output = gson.fromJson(json, new TypeToken<HashMap<String, Object>>(){}.getType());
                        break;

                    default:
                        span.setTag(Tags.ERROR, true);
                        span.log(Collections.singletonMap(Fields.ERROR_OBJECT, new Exception("Unsupported Content-Type: " + contentType)));
                }
            }
        } catch (Exception e) {
            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));
        }

        return output;
    }

}