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
            Class.forName("org.postgresql.Driver");

            String postgresURL;
            if (System.getProperty("dd.env").equals("kubernetes")) {
                postgresURL = "jdbc:postgresql://host.minikube.internal:5432/vulcan_users";
            } else {
                postgresURL = "jdbc:postgresql://user-database:5432/vulcan_users";
            }

            Connection conn = DriverManager.getConnection(postgresURL, "vulcan", "yKCstvg4hrB9pmDP");
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
            String mongoURL;
            if (System.getProperty("dd.env") == "kubernetes") {
                mongoURL = "mongodb://host.minikube.internal:27017";
            } else {
                mongoURL = "mongodb://god-database:27017";
            }

            MongoClient client = MongoClients.create(mongoURL);
            coll = client.getDatabase("vulcan").getCollection("gods");
        } catch (Exception e) {
            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

            coll = null;
        }
        return coll;
    }
}
