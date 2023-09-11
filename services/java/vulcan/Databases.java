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

    public static MongoCollection<Document> godDatabse() {
        MongoCollection<Document> coll;
        Span span = GlobalTracer.get().activeSpan();

        try {
            MongoClient client = MongoClients.create("mongodb://god-database:27017");
            coll = client.getDatabase("vulcan").getCollection("gods");
        } catch (Exception e) {
            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

            coll = null;
        }
        return coll;
    }
}
