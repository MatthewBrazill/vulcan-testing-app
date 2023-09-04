package vulcan;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Collections;

import io.opentracing.Span;
import io.opentracing.log.Fields;
import io.opentracing.tag.Tags;
import io.opentracing.util.GlobalTracer;

public class Databases {

    public static Statement userDatabase() {
        Statement statement;
        Span span = GlobalTracer.get().activeSpan();

        try {
            Class.forName("org.postgresql.Driver");
            Connection conn = DriverManager.getConnection("jdbc:postgresql://user-database:5432/vulcan_users", "vulcan", "yKCstvg4-hrB9pmDPzu.gG.jxzhcCafT@");
            statement = conn.createStatement(ResultSet.TYPE_SCROLL_INSENSITIVE, ResultSet.CONCUR_READ_ONLY);
        } catch (Exception e) {
            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

            statement = null;
        }

        return statement;
    }

    public static void godDatabse() {
        return;
    }
}
