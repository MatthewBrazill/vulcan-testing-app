package vulcan;

import java.sql.ResultSet;
import java.util.Collections;
import java.util.HashMap;

import io.opentracing.Span;
import io.opentracing.log.Fields;
import io.opentracing.tag.Tags;
import io.opentracing.util.GlobalTracer;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

public class Helpers {

    public static Boolean validate(HttpServletRequest req, String[][] patterns) {
        return true;
    }

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

    public static HashMap<String, Object> getBody(HttpServletRequest req) {
        String[] body;
        HashMap<String, Object> output = new HashMap<String, Object>();
        Span span = GlobalTracer.get().activeSpan();

        try {
            if (req.getReader().ready()) {
                body = req.getReader().readLine().split("&");
                for (int i = 0; i < body.length; i++) {
                    String[] attribute = body[i].split("=");
                    if (attribute[1] != "") {
                        output.put(attribute[0], attribute[1]);
                    }
                }
            }
        } catch (Exception e) {
            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));
        }

        return output;
    }

}