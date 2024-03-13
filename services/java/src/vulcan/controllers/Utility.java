package vulcan.controllers;

import java.util.Collections;
import java.util.HashMap;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import io.opentracing.Span;
import io.opentracing.log.Fields;
import io.opentracing.tag.Tags;
import io.opentracing.util.GlobalTracer;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Controller
public class Utility {

    @ResponseBody
    @RequestMapping(value = "/error", method = RequestMethod.GET)
    public HashMap<String, Object> errorAPI(HttpServletRequest req, HttpServletResponse res) {
        HashMap<String, Object> resBody = new HashMap<String, Object>();
        Span span = GlobalTracer.get().activeSpan();

        Error err = new Error("Deliberate Error: error testing enpoint");
        span.setTag(Tags.ERROR, true);
        span.log(Collections.singletonMap(Fields.ERROR_OBJECT, err));

        res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        resBody.put("message", "This is a error testing endpoint. It will always return a 500 error.");
        return resBody;
    }
}