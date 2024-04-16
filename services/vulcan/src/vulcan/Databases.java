package vulcan;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Collections;

import org.bson.Document;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;

import datadog.trace.api.Trace;
import io.opentracing.Span;
import io.opentracing.log.Fields;
import io.opentracing.tag.Tags;
import io.opentracing.util.GlobalTracer;

public class Databases {

    @Trace(operationName = "vulcan.database", resourceName = "Databases.userDatabase")
    public static Statement userDatabase() {
        Statement statement;
        Span span = GlobalTracer.get().activeSpan();

        try {
            Connection conn = DriverManager.getConnection("jdbc:postgresql://database-proxy:5432/vulcan_users", "vulcan", "yKCstvg4hrB9pmDP");
            statement = conn.createStatement(ResultSet.TYPE_SCROLL_INSENSITIVE, ResultSet.CONCUR_READ_ONLY);
        } catch (Exception e) {
            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

            statement = null;
        }

        return statement;
    }

    @Trace(operationName = "vulcan.database", resourceName = "Databases.godDatabase")
    public static MongoCollection<Document> godDatabse() {
        MongoCollection<Document> coll;
        Span span = GlobalTracer.get().activeSpan();

        try {
            MongoClient client = MongoClients.create("mongodb://database-proxy:27017");
            coll = client.getDatabase("vulcan").getCollection("gods");
        } catch (Exception e) {
            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

            coll = null;
        }
        return coll;
    }
}
